import { User, Customer, Order, PrismaClient } from "@prisma/client"

import { CustomerData } from "../interfaces/CustomerData"
import { PaymentData } from "../interfaces/PaymentData"
import { SnackData } from "../interfaces/SnackData"
import { UserData } from "../interfaces/UserData"
import PaymentService from "./PaymentService"

export default class CheckoutService {
  private prisma: PrismaClient

  // new CheckoutService()
  constructor() {
    this.prisma = new PrismaClient()
  }

  async process(
    cart: SnackData[],
    usuario: UserData[],
    customer: CustomerData,
    payment: PaymentData
  ): Promise<{ id: number; transactionId: string; status: string }> {
    // TODO: "puxar" os dados de snacks do BD
    // in: [1,2,3,4]


    const snacks = await this.prisma.snack.findMany({
      where: {
        id: {
          in: cart.map((snack) => snack.id),
        },
      },
    })
    // console.log(`snacks`, snacks)

    const snacksInCart = snacks.map<SnackData>((snack) => ({
      ...snack,
      price: Number(snack.price),
      quantity: cart.find((item) => item.id === snack.id)?.quantity!,
      subTotal:
        cart.find((item) => item.id === snack.id)?.quantity! *
        Number(snack.price),
    }))


    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: usuario.map((user) => user.id),
        },
      },
    })

    console.log(`users`, users);

    const usersInUsuario = users.map<UserData>((user) => ({
      ...user,
      id: Number(user.id),
      usuario: String(user.usuario),
      email: String(user.email),
      password: String(user.password),
      imagem: String(user.imagem),
      isVerified: Boolean(user.isVerified),
      verificationToken: String(user.verificationToken),
      resetToken: String(user.resetToken),
      ativo: String(user.ativo),
      phone: String(user.phone)
    }))
    

    // console.log(`snacksInCart`, snacksInCart)

    // TODO: registrar os dados do cliente no BD
    const customerCreated = await this.createCustomer(customer)
    // console.log(`customerCreated`, customerCreated)

    // TODO: criar uma order orderitem
    let orderCreated = await this.createOrder(snacksInCart, usersInUsuario, customerCreated)
    // console.log(`orderCreated`, orderCreated)

    // TODO: processar o pagamento
    const { transactionId, status } = await new PaymentService().process(
      orderCreated,
      customerCreated,
      payment
    )

    orderCreated = await this.prisma.order.update({
      where: { id: orderCreated.id },
      data: {
        transactionId,
        status,
      },
    })

    return {
      id: orderCreated.id,
      transactionId: orderCreated.transactionId!,
      status: orderCreated.status,
    }
  }

  private async createCustomer(customer: CustomerData): Promise<Customer> {
    const customerCreated = await this.prisma.customer.upsert({
      where: { email: customer.email },
      update: customer,
      create: customer,
    })

    return customerCreated
  }

  private async createOrder(
    snacksInCart: SnackData[],
    //usersInUsuario: UserData[],
    users: UserData[],
    customer: Customer
  ): Promise<Order> {
    const total = snacksInCart.reduce((acc, snack) => acc + snack.subTotal, 0)
    const orderCreated = await this.prisma.order.create({
      data: {
        total,
        user: {
          connect: { id: customer.id},
        },
        customer: {
          connect: { id: customer.id },
        },
        orderItems: {
          createMany: {
            data: snacksInCart.map((snack) => ({
              snackId: snack.id,
              quantity: snack.quantity,
              subTotal: snack.subTotal,
            })),
          },
        },
      },
      include: {
        customer: true,
        user: true,
        orderItems: { include: { snack: true } },
      },
    })

    return orderCreated
  }
}
